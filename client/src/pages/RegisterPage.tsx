import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext.js';
import {
  Users,
  User,
  Hash,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (route: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { team, teamCode: existingCode, setTeamSession, logoutTeam } = useTeam();

  const [teamCode, setTeamCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  // Form fields: start completely EMPTY
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderRoll, setLeaderRoll] = useState('');
  const [member2Name, setMember2Name] = useState('');
  const [member2Roll, setMember2Roll] = useState('');
  const [member3Name, setMember3Name] = useState('');
  const [member3Roll, setMember3Roll] = useState('');
  const [member4Name, setMember4Name] = useState('');
  const [member4Roll, setMember4Roll] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-redirect if already registered
  useEffect(() => {
    const code = existingCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_team_code') : null);
    const savedTeam = team || (typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_team') : null);
    if (code && savedTeam) {
      fetch(`/api/quiz/current?teamCode=${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.eventState === 'LIVE' && !data.completed) {
            onNavigate('/quiz');
          } else {
            onNavigate('/waiting');
          }
        })
        .catch(() => {
          onNavigate('/waiting');
        });
      return;
    }

    if (existingCode) {
      setTeamCode(existingCode);
      return;
    }

    fetchTeamCode();
  }, [existingCode, team, onNavigate]);

  const fetchTeamCode = async () => {
    setLoadingCode(true);
    try {
      const res = await fetch('/api/teams/generate-code');
      const data = await res.json();
      if (data.teamCode) {
        setTeamCode(data.teamCode);
      }
    } catch (err) {
      console.error('Failed to generate code:', err);
    } finally {
      setLoadingCode(false);
    }
  };

  const copyCode = () => {
    if (!teamCode) return;
    navigator.clipboard.writeText(teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Form validation
    if (!teamName.trim()) {
      setErrorMsg('Team Name is required');
      return;
    }
    if (!leaderName.trim()) {
      setErrorMsg('Team Leader Name is required');
      return;
    }
    if (!leaderRoll.trim()) {
      setErrorMsg('Team Leader Roll Number is required');
      return;
    }
    if (!member2Name.trim()) {
      setErrorMsg('Member 2 Name is required');
      return;
    }
    if (!member2Roll.trim()) {
      setErrorMsg('Member 2 Roll Number is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_code: teamCode,
          team_name: teamName.trim(),
          leader_name: leaderName.trim(),
          leader_roll: leaderRoll.trim(),
          member2_name: member2Name.trim(),
          member2_roll: member2Roll.trim(),
          member3_name: member3Name.trim() || undefined,
          member3_roll: member3Roll.trim() || undefined,
          member4_name: member4Name.trim() || undefined,
          member4_roll: member4Roll.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.includes('already registered')) {
          onNavigate('/waiting');
          return;
        }
        setErrorMsg(data.error || 'Registration failed. Please check your details.');
        setIsSubmitting(false);
        return;
      }

      // Save to context & localStorage synchronously
      localStorage.setItem('nexus_team', JSON.stringify(data.team));
      localStorage.setItem('nexus_team_code', data.teamCode);
      localStorage.setItem('nexus_session_id', data.sessionId);
      setTeamSession(data.team, data.sessionId);

      // Route strictly according to event state
      if (data.eventState === 'LIVE') {
        onNavigate('/quiz');
      } else {
        onNavigate('/waiting');
      }
    } catch (err) {
      console.error('Registration network error:', err);
      setErrorMsg('Network error connecting to server. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>NEURAL NEXUS 2026 REGISTRATION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Register Your Team
          </h1>
          <p className="text-sm text-slate-400">
            Enter your team details below. All fields start empty. You will receive an independent randomized question sequence upon starting.
          </p>
        </div>

        {/* If team already registered, provide instant access to waiting room */}
        {existingCode && (team?.team_name || localStorage.getItem('nexus_team')) && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 text-center space-y-3 animate-fadeIn">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" />
              <span>Team Already Registered</span>
            </span>
            <h3 className="text-xl font-black text-white">
              {team?.team_name || JSON.parse(localStorage.getItem('nexus_team') || '{}').team_name || 'Your Team'}
            </h3>
            <p className="text-xs text-slate-300">
              Your registered team code is <span className="font-mono font-bold text-amber-400">{existingCode}</span>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/waiting')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>ENTER WAITING ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  logoutTeam();
                  setTeamCode('');
                  fetchTeamCode();
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition underline cursor-pointer py-2"
              >
                Register a different team
              </button>
            </div>
          </div>
        )}

        {/* Unique Team Code Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 text-center space-y-3 shadow-2xl relative overflow-hidden">
          <div className="text-xs uppercase tracking-widest text-amber-400/90 font-bold">
            YOUR UNIQUE TEAM CODE
          </div>
          <div className="flex items-center justify-center space-x-3">
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800">
              {loadingCode ? 'GENERATING...' : (teamCode || 'NN26-....')}
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition active:scale-95 cursor-pointer"
              title="Copy Team Code"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Keep this code handy. Refreshing the browser will automatically restore your quiz session.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error: </span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Team Name <span className="text-amber-400">*</span></span>
            </label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Binary Beasts, Neural Knights"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm"
            />
          </div>

          <div className="border-t border-slate-800/80 pt-4 space-y-4">
            <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
              1. Team Leader (Required)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Leader Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Leader Name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex items-center space-x-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Leader Roll Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={leaderRoll}
                  onChange={(e) => setLeaderRoll(e.target.value.toUpperCase())}
                  placeholder="e.g. 26AD001"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Member 2 */}
          <div className="border-t border-slate-800/80 pt-4 space-y-4">
            <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
              2. Member 2 (Required)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Member 2 Name *</label>
                <input
                  type="text"
                  required
                  value={member2Name}
                  onChange={(e) => setMember2Name(e.target.value)}
                  placeholder="Member 2 Name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Member 2 Roll Number *</label>
                <input
                  type="text"
                  required
                  value={member2Roll}
                  onChange={(e) => setMember2Roll(e.target.value.toUpperCase())}
                  placeholder="e.g. 26AD002"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Member 3 (Optional) */}
          <div className="border-t border-slate-800/80 pt-4 space-y-4">
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              3. Member 3 (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Member 3 Name</label>
                <input
                  type="text"
                  value={member3Name}
                  onChange={(e) => setMember3Name(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Member 3 Roll Number</label>
                <input
                  type="text"
                  value={member3Roll}
                  onChange={(e) => setMember3Roll(e.target.value.toUpperCase())}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Member 4 (Optional) */}
          <div className="border-t border-slate-800/80 pt-4 space-y-4">
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              4. Member 4 (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Member 4 Name</label>
                <input
                  type="text"
                  value={member4Name}
                  onChange={(e) => setMember4Name(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Member 4 Roll Number</label>
                <input
                  type="text"
                  value={member4Roll}
                  onChange={(e) => setMember4Roll(e.target.value.toUpperCase())}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>REGISTERING TEAM...</span>
                </>
              ) : (
                <>
                  <span>REGISTER TEAM &amp; JOIN WAITING ROOM</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
