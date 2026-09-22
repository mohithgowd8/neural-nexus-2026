import React from 'react';
import { CheckCircle2, Circle, Eye } from 'lucide-react';

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  visitedIndices: Set<number>;
  answeredIndices: Set<number>;
  onSelectQuestion: (index: number) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  totalQuestions,
  currentIndex,
  visitedIndices,
  answeredIndices,
  onSelectQuestion,
  isOpenMobile,
  onCloseMobile
}) => {
  const answeredCount = answeredIndices.size;
  const unansweredCount = totalQuestions - answeredCount;

  const content = (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Question Navigator
        </h3>
        <span className="text-xs font-mono text-amber-400 font-semibold">
          {answeredCount} / {totalQuestions} Done
        </span>
      </div>

      {/* Status Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="w-3 h-3 rounded-md bg-emerald-500/30 border border-emerald-500" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="w-3 h-3 rounded-md bg-amber-500/30 border border-amber-500" />
          <span>Visited</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
          <span>Not Visited</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="w-3 h-3 rounded-md ring-2 ring-amber-400 bg-amber-400" />
          <span>Current</span>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-5 gap-2.5 max-h-72 overflow-y-auto pr-1">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const isCurrent = currentIndex === i;
          const isAnswered = answeredIndices.has(i);
          const isVisited = visitedIndices.has(i) && !isAnswered;

          let btnClass = 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600';

          if (isAnswered) {
            btnClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
          } else if (isVisited) {
            btnClass = 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold';
          }

          if (isCurrent) {
            btnClass += ' ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 font-extrabold text-white';
          }

          return (
            <button
              key={i}
              onClick={() => {
                onSelectQuestion(i);
                onCloseMobile();
              }}
              className={`h-11 rounded-xl border flex items-center justify-center text-sm font-mono transition-all ${btnClass}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Bottom Summary */}
      <div className="pt-2 border-t border-slate-800 text-xs flex justify-between text-slate-400 font-medium">
        <span>Unanswered: <strong className="text-orange-400">{unansweredCount}</strong></span>
        <span>Remaining: <strong className="text-slate-200">{unansweredCount}</strong></span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <div className="hidden lg:block w-full">
        {content}
      </div>

      {/* Mobile Drawer view */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end animate-fadeIn">
          <div className="w-full bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2">
              <span className="text-sm font-bold text-white uppercase">Questions Overview</span>
              <button
                onClick={onCloseMobile}
                className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
};
