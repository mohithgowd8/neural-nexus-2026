import React from 'react';
import {
  LayoutDashboard,
  HelpCircle,
  Users,
  Trophy,
  Settings,
  LogOut,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext.js';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onNavigate: (route: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentTab, onSelectTab, onNavigate }) => {
  const { logout, admin } = useAdminAuth();

  const navItems = [
    { id: 'dashboard', label: 'Live Monitor & Controls', icon: LayoutDashboard },
    { id: 'questions', label: 'Question Bank (100 Qs)', icon: HelpCircle },
    { id: 'teams', label: 'Registered Teams', icon: Users },
    { id: 'leaderboard', label: 'Live Leaderboard', icon: Trophy },
    { id: 'settings', label: 'Quiz Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-md shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-wide text-white">ORGANIZER HUB</h2>
            <p className="text-[11px] text-amber-400 font-mono">Neural Nexus 2026</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 px-3 py-1">
          Event Control
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-4 text-[11px] uppercase tracking-wider font-bold text-slate-500 px-3 py-1">
          Participant Portals
        </div>

        <button
          onClick={() => onNavigate('/')}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <span>View Public Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onNavigate('/leaderboard')}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:bg-slate-800 transition cursor-pointer"
        >
          <span>Public Leaderboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Admin Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-white truncate">{admin?.username || 'Admin'}</div>
            <div className="text-[10px] text-amber-400/80 font-mono">Master Administrator</div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
