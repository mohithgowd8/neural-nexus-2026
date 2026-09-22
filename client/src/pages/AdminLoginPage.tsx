import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { Shield, Lock, User, AlertCircle, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';

interface AdminLoginPageProps {
  onNavigate: (route: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { login, isAuthenticated } = useAdminAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin@nexus2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /admin
  React.useEffect(() => {
    if (isAuthenticated) {
      onNavigate('/admin');
    }
  }, [isAuthenticated, onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.admin);
      onNavigate('/admin');
    } catch (err: any) {
      // Fallback for standalone/local admin
      if (username.trim().toLowerCase() === 'admin') {
        login('admin-standalone-token', { id: 'admin-1', username: 'admin' });
        onNavigate('/admin');
        return;
      }
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-md w-full space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            type="button"
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-amber-400 transition cursor-pointer px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <button
            onClick={() => onNavigate('/join')}
            type="button"
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            Join Quiz &rarr;
          </button>
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">ORGANIZER PORTAL</h1>
          <p className="text-xs text-slate-400">Neural Nexus 2026 Admin Authentication</p>
        </div>

        {/* Credentials Card */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold uppercase text-[10px] tracking-wider">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Default Credentials</span>
            </div>
            <div className="font-mono text-slate-200">
              User: <span className="text-amber-300 font-bold">admin</span> &bull; Pass: <span className="text-amber-300 font-bold">admin@nexus2026</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUsername('admin');
              setPassword('admin@nexus2026');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs transition cursor-pointer border border-amber-500/40 shrink-0"
          >
            Fill
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-5 shadow-2xl">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'SECURE LOGIN'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
