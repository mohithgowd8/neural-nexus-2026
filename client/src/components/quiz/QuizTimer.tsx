import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface QuizTimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({ initialSeconds, onTimeUp, isPaused = false }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused) return;
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, isPaused, onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Warning thresholds
  const isUrgent = secondsLeft <= 60;
  const isWarning = secondsLeft <= 300 && !isUrgent;
  const isCritical = secondsLeft <= 10;

  let timerStyles = 'bg-slate-800/90 text-amber-400 border-amber-500/30';
  if (isCritical) {
    timerStyles = 'bg-red-950 text-red-400 border-red-500 animate-pulse ring-2 ring-red-500/50';
  } else if (isUrgent) {
    timerStyles = 'bg-red-950/70 text-red-400 border-red-500/40';
  } else if (isWarning) {
    timerStyles = 'bg-amber-950/60 text-amber-300 border-amber-500/40';
  }

  return (
    <div className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border shadow-lg transition-all ${timerStyles}`}>
      {isUrgent ? (
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce text-red-400" />
      ) : (
        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
      )}
      <span className="font-mono text-base sm:text-xl font-bold tracking-wider">
        {formattedTime}
      </span>
      {isPaused && (
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-500 text-black rounded">
          Paused
        </span>
      )}
    </div>
  );
};
