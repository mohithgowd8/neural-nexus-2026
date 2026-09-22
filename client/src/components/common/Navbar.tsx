import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { useAdminAuth } from '../../context/AdminAuthContext.js';
import { Cpu, Wifi, WifiOff, Users, Shield, Menu, X, Trophy, BookOpen, Monitor } from 'lucide-react';

interface NavbarProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const { team, logoutTeam } = useTeam();
  const { isConnected } = useSocket();
  const { isAuthenticated, logout: logoutAdmin } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (route: string) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Department */}
          <div
            onClick={() => handleNav('/')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wider text-base sm:text-lg bg-gradient-to-r from-amber-400 via-amber-200 to-orange-400 bg-clip-text text-transparent">
                  NEURAL NEXUS 2026
                </span>
                <span className="hidden md:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  AI &amp; DS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-medium hidden sm:block">
                THINK. DECODE. INNOVATE.
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => handleNav('/')}
              className={`text-sm font-medium transition-colors ${currentRoute === '/' ? 'text-amber-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              Home
            </button>
            <button
              onClick={() => handleNav('/rules')}
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${currentRoute === '/rules' ? 'text-amber-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Rules</span>
            </button>
            <button
              onClick={() => handleNav('/leaderboard')}
              className={`flex items-center space-x-1.5 text-sm font-medium transition-colors ${currentRoute === '/leaderboard' ? 'text-amber-400 font-semibold' : 'text-slate-300 hover:text-white'}`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => handleNav('/display')}
              className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Auditorium Projector Display"
            >
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span>Projector</span>
            </button>
          </nav>

          {/* Status & Team / Admin Badge */}
          <div className="hidden sm:flex items-center space-x-4">
            {/* Live Socket status */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}
              title={isConnected ? 'Live Connection Active' : 'Disconnected - Reconnecting'}
            >
              {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
              <span className="hidden lg:inline">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>

            {/* Team Pill */}
            {team && (
              <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">
                    {team.team_name || team.name}
                  </div>
                  <div className="text-[10px] font-mono text-amber-400">{team.id}</div>
                </div>
                <button
                  onClick={logoutTeam}
                  className="text-xs text-slate-400 hover:text-red-400 ml-1 transition cursor-pointer"
                  title="Switch / Leave Team"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Admin Pill */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <button
                  onClick={() => handleNav('/admin')}
                  className="text-xs font-bold text-amber-400 hover:underline"
                >
                  Admin Panel
                </button>
                <button
                  onClick={logoutAdmin}
                  className="text-xs text-slate-400 hover:text-red-400 ml-1 transition"
                  title="Logout Admin"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('/admin/login')}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition"
              >
                Admin
              </button>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden items-center space-x-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
              }`}
              title={isConnected ? 'Connected' : 'Offline'}
            />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          {team && (
            <div className="bg-slate-800/80 p-3 rounded-lg flex items-center justify-between border border-slate-700">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-200">{team.name}</div>
                  <div className="text-xs font-mono text-amber-400">{team.id}</div>
                </div>
              </div>
              <button onClick={logoutTeam} className="text-xs text-red-400 px-2 py-1 bg-red-500/10 rounded">
                Switch
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => handleNav('/')}
              className="p-2.5 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium text-left hover:bg-slate-700"
            >
              Home
            </button>
            <button
              onClick={() => handleNav('/rules')}
              className="p-2.5 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium text-left hover:bg-slate-700 flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Rules</span>
            </button>
            <button
              onClick={() => handleNav('/leaderboard')}
              className="p-2.5 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium text-left hover:bg-slate-700 flex items-center space-x-1.5"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => handleNav('/display')}
              className="p-2.5 rounded-lg bg-slate-800 text-slate-200 text-sm font-medium text-left hover:bg-slate-700 flex items-center space-x-1.5"
            >
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>Projector</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            {isAuthenticated ? (
              <button
                onClick={() => handleNav('/admin')}
                className="w-full p-2.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-semibold flex items-center justify-center space-x-2"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => handleNav('/admin/login')}
                className="w-full p-2.5 rounded-lg bg-slate-800 text-slate-400 text-sm font-medium"
              >
                Admin Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
