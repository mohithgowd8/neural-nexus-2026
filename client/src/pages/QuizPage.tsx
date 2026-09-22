import React, { useState, useEffect, useRef } from 'react';
import { useTeam } from '../context/TeamContext.js';
import { useSocket } from '../context/SocketContext.js';
import {
  Timer,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  ArrowRight,
  Sparkles,
  Zap,
  HelpCircle,
  Clock,
  Flame,
  Award
} from 'lucide-react';

interface QuizPageProps {
  onNavigate: (route: string) => void;
  roundId?: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  image_url?: string | null;
  category?: string;
  points?: number;
}

export const QuizPage: React.FC<QuizPageProps> = ({ onNavigate }) => {
  const { team, teamCode, sessionId } = useTeam();
  const { socket } = useSocket();

  // Quiz state
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [currentScore, setCurrentScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [totalDuration, setTotalDuration] = useState<number>(120);

  // Feedback state
  const [lastFeedback, setLastFeedback] = useState<{
    points: number;
    isCorrect: boolean;
  } | null>(null);

  // Anti-cheat tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && socket && teamCode) {
        socket.emit('TAB_SWITCH_DETECTED', {
          teamCode,
          currentIndex
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, teamCode, currentIndex]);

  // Load current question from server
  const fetchCurrentQuestion = async () => {
    if (!teamCode) {
      onNavigate('/join');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/quiz/current?teamCode=${teamCode}&sessionId=${sessionId || ''}`);
      const data = await res.json();

      if (data.eventState === 'WAITING') {
        onNavigate('/waiting');
        return;
      }

      if (data.completed) {
        setCompleted(true);
        setResultsData(data);
        setLoading(false);
        return;
      }

      if (data.question) {
        setQuestion(data.question);
        setCurrentIndex(data.currentIndex || 1);
        setTotalQuestions(data.totalQuestions || 100);
        setCurrentScore(data.totalScore || 0);
        setSelectedOption(data.selectedOption || null);
        setTimeRemaining(data.timeRemainingSeconds !== undefined ? data.timeRemainingSeconds : 120);
        setTotalDuration(data.totalDurationSeconds || 120);
      }
    } catch (err) {
      console.error('Failed to fetch question:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentQuestion();

    // Check status periodically for organizer commands (Pause / End / Reset)
    const statusInterval = setInterval(async () => {
      if (completed || isSubmitting) return;
      try {
        const res = await fetch(`/api/quiz/current?teamCode=${teamCode}&sessionId=${sessionId || ''}`);
        const data = await res.json();
        if (data.eventState === 'WAITING') {
          onNavigate('/waiting');
        } else if (data.eventState === 'COMPLETED' || data.completed) {
          setCompleted(true);
          setResultsData(data);
        }
      } catch {
        // silent
      }
    }, 2500);

    return () => clearInterval(statusInterval);
  }, [teamCode, sessionId, completed, isSubmitting, onNavigate]);

  // Listen to live socket events for pause / end
  useEffect(() => {
    if (!socket) return;
    const handleStatus = (data: { status: string }) => {
      if (data.status === 'WAITING') {
        onNavigate('/waiting');
      } else if (data.status === 'COMPLETED') {
        setCompleted(true);
      }
    };
    socket.on('EVENT_STATUS_CHANGED', handleStatus);
    socket.on('QUIZ_PAUSED', () => onNavigate('/waiting'));
    socket.on('QUIZ_ENDED', () => setCompleted(true));
    return () => {
      socket.off('EVENT_STATUS_CHANGED', handleStatus);
      socket.off('QUIZ_PAUSED');
      socket.off('QUIZ_ENDED');
    };
  }, [socket, onNavigate]);

  // Real-time local countdown synchronizer
  useEffect(() => {
    if (loading || completed || !question) return;

    const timerInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [loading, completed, question?.id]);

  // Handle timer expiry (00:00)
  const handleTimeExpired = async () => {
    if (isSubmitting || completed) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/quiz/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode,
          selectedOption: selectedOption || 'TIMEOUT'
        })
      });

      const data = await res.json();

      if (data.completed) {
        // Fetch full results
        const resResults = await fetch(`/api/quiz/results/${teamCode}`);
        const rData = await resResults.json();
        setResultsData(rData);
        setCompleted(true);
      } else {
        // Clear selection and load next question
        setSelectedOption(null);
        await fetchCurrentQuestion();
      }
    } catch (err) {
      console.error('Timeout handling error:', err);
      await fetchCurrentQuestion();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!selectedOption || isSubmitting || completed) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/quiz/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode,
          sessionId,
          selectedOption
        })
      });

      const data = await res.json();

      if (data.success) {
        setLastFeedback({
          points: data.pointsAwarded,
          isCorrect: data.isCorrect
        });

        // Clear feedback after 1.5s
        setTimeout(() => setLastFeedback(null), 1500);

        if (data.completed) {
          const resResults = await fetch(`/api/quiz/results/${teamCode}`);
          const rData = await resResults.json();
          setResultsData(rData);
          setCompleted(true);
        } else {
          setSelectedOption(null);
          await fetchCurrentQuestion();
        }
      }
    } catch (err) {
      console.error('Submit answer error:', err);
      await fetchCurrentQuestion();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer urgency color
  const isUrgent = timeRemaining <= 20;

  // ==================== RESULTS SCREEN ====================
  if (completed && resultsData) {
    const totalQ = resultsData.totalQuestions || 100;
    const score = resultsData.totalScore || 0;
    const correct = resultsData.correctAnswers || resultsData.correctCount || 0;
    const accuracy = resultsData.accuracy !== undefined ? resultsData.accuracy : Math.round((correct / Math.max(1, totalQ)) * 100);
    const avgTime = resultsData.avgAnswerTimeSeconds || resultsData.avgAnswerTime || 0;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy Icon */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Trophy className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              <span>QUIZ COMPLETED</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              {resultsData.teamName || team?.team_name || 'Team Quiz Finished!'}
            </h1>
            <p className="font-mono text-xs sm:text-sm text-slate-400">
              Team Code: <span className="text-amber-400 font-bold">{resultsData.teamCode || teamCode}</span>
            </p>
          </div>

          {/* Performance Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Total Score</div>
              <div className="text-3xl font-black text-amber-400">{score}</div>
              <div className="text-[10px] text-slate-500">Points Earned</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Correct Answers</div>
              <div className="text-3xl font-black text-emerald-400">{correct} / {totalQ}</div>
              <div className="text-[10px] text-slate-500">Total Solved</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Accuracy</div>
              <div className="text-3xl font-black text-sky-400">{accuracy}%</div>
              <div className="text-[10px] text-slate-500">Precision Rate</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Avg Answer Speed</div>
              <div className="text-3xl font-black text-orange-400">{avgTime}s</div>
              <div className="text-[10px] text-slate-500">Per Question</div>
            </div>
          </div>

          {/* Action CTA */}
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/leaderboard')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98"
            >
              <span>VIEW FINAL LEADERBOARD</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide">Loading question sequence...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-slate-950 text-slate-300 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">No Question Available</h2>
          <p className="text-xs text-slate-400">
            Please verify with event organizers that the question bank is populated and the event is live.
          </p>
          <button
            onClick={fetchCurrentQuestion}
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Event & Question Info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden sm:block font-black text-sm uppercase tracking-wider text-amber-400">
              NEURAL NEXUS 2026
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                QUESTION
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-white px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
                {currentIndex} / {totalQuestions}
              </span>
            </div>
          </div>

          {/* Center/Right: Score & Timer */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Score */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs text-slate-400 font-medium">Score:</span>
              <span className="font-mono text-sm sm:text-base font-black text-amber-400">
                {currentScore}
              </span>
            </div>

            {/* Strict 2-Minute Timer */}
            <div
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border transition-colors ${
                isUrgent
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-400 animate-pulse'
                  : 'bg-slate-950/80 border-slate-800 text-slate-200'
              }`}
            >
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold leading-none">
                  TIME LEFT
                </span>
                <span className="font-mono text-base sm:text-lg font-black tracking-wider leading-tight">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="max-w-5xl mx-auto mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${(currentIndex / totalQuestions) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col space-y-6">
        {/* Category & Points Pill */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
            {question.category || 'AI & Data Science'}
          </span>
          <span className="text-slate-400 text-xs flex items-center space-x-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fast speed earns up to 10 points</span>
          </span>
        </div>

        {/* Large Question Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-relaxed">
            {question.question_text}
          </h2>

          {/* Optional Diagram / Image Display */}
          {question.image_url && (
            <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-72 flex items-center justify-center bg-slate-950 p-2">
              <img
                src={question.image_url}
                alt="Question Diagram"
                className="max-h-64 object-contain rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Four Separate Clickable Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt) => {
            const isSelected = selectedOption === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedOption(opt.key)}
                className={`p-5 sm:p-6 rounded-2xl border text-left transition-all duration-150 flex items-start space-x-4 cursor-pointer active:scale-98 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/50'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                {/* Option Badge */}
                <div
                  className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm font-mono border transition-colors ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {opt.key}
                </div>

                <div className="text-sm sm:text-base font-medium leading-relaxed pt-1 flex-1">
                  {opt.text}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Actions Bar (Strict: No Skip, No Previous) */}
        <div className="pt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedOption ? (
              <span className="text-amber-400 font-semibold">
                Option {selectedOption} selected. Click Submit to advance.
              </span>
            ) : (
              <span>Select an option before advancing.</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={!selectedOption || isSubmitting}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center space-x-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            <span>{isSubmitting ? 'RECORDING...' : 'SUBMIT ANSWER'}</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </main>
    </div>
  );
};
