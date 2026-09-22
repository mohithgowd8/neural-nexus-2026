import React, { useEffect, useState } from 'react';
import { BookOpen, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface RulesPageProps {
  onNavigate: (route: string) => void;
}

export const RulesPage: React.FC<RulesPageProps> = ({ onNavigate }) => {
  const [rulesText, setRulesText] = useState<string>('');

  useEffect(() => {
    fetch('/api/teams/session')
      .then(res => res.json())
      .then(data => {
        if (data.event?.rules_text) {
          setRulesText(data.event.rules_text);
        }
      })
      .catch(() => {});
  }, []);

  const defaultRulesList = [
    'Teams must contain 2 to 4 members from AI & DS first year.',
    'Each team must use its designated registered team account and Team ID.',
    'Do not refresh your browser unnecessarily during a live round; answers auto-save automatically in real-time.',
    'Answers must be submitted before the server countdown timer hits 00:00.',
    'Once submitted, answers for that round are locked and cannot be changed.',
    'Organizers and jury decisions regarding scoring, tie-breaks, and event execution are final.',
    'Any temporary technical connectivity issues should be reported immediately to event student volunteers in the hall.'
  ];

  const parsedRules = rulesText
    ? rulesText.split(/\n+/).map(r => r.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean)
    : defaultRulesList;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OFFICIAL GUIDELINES</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            EVENT RULES &amp; CODE OF CONDUCT
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Neural Nexus 2026 &bull; Department of Artificial Intelligence &amp; Data Science
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl">
          <div className="space-y-4">
            {parsedRules.map((rule, idx) => (
              <div key={idx} className="flex items-start space-x-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                  {rule}
                </p>
              </div>
            ))}
          </div>

          {/* Scoring clarification note */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Scoring Engine Formula
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Total Score = (Correct Answers &times; Question Marks) &minus; (Wrong Answers &times; Negative Marking). Unanswered questions carry zero penalty. In the event of a score tie, lower total completion time acts as the tiebreaker.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-center">
            <button
              onClick={() => onNavigate('/')}
              className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center space-x-2"
            >
              <span>Back to Event Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
