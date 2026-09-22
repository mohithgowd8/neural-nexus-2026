import React from 'react';
import { useTeam } from '../context/TeamContext.js';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Timer,
  Shuffle,
  Trophy,
  Cpu,
  Users
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { team, teamCode } = useTeam();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32 border-b border-slate-800/80 flex-1 flex items-center">
        {/* Ambient Tech Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-gradient-to-tr from-amber-500/15 to-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          {/* Department badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Department of Artificial Intelligence &amp; Data Science</span>
          </div>

          {/* Main Title & Tagline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase font-sans">
              NEURAL <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">NEXUS</span> 2026
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-widest text-slate-300 uppercase">
              THINK. DECODE. INNOVATE.
            </p>
          </div>

          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base md:text-lg leading-relaxed font-normal">
            Welcome to the flagship real-time quiz competition. Every team receives a unique, independently randomized 100-question sequence with strict 2-minute question timers and speed-based scoring.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={async () => {
                const code = teamCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_team_code') : null);
                if (!code) {
                  onNavigate('/join');
                  return;
                }
                try {
                  const res = await fetch(`/api/quiz/current?teamCode=${code}`);
                  const data = await res.json();
                  if (data.eventState === 'LIVE' && !data.completed) {
                    onNavigate('/quiz');
                  } else {
                    onNavigate('/waiting');
                  }
                } catch {
                  onNavigate('/waiting');
                }
              }}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg tracking-wide shadow-2xl shadow-amber-500/30 flex items-center justify-center space-x-3 transition-transform active:scale-95 cursor-pointer"
            >
              <span>{teamCode ? `ENTER QUIZ (${teamCode})` : 'JOIN QUIZ'}</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>

            <button
              onClick={() => onNavigate('/leaderboard')}
              className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-base flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>LEADERBOARD</span>
            </button>
          </div>

          {/* Platform Highlights */}
          <div className="pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Shuffle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Randomized Sequence</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every team receives an independently shuffled question order generated uniquely per session.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                <Timer className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">2-Minute Question Timer</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict 120s server timer per question. Automatically advances upon expiration.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Fast Answer Scoring</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Points awarded based on speed and correctness. Faster answers yield higher scores.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
