import React from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { Wifi, WifiOff, Users, Radio } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  eventStatus?: string;
  connectedParticipants?: number;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  eventStatus = 'LIVE',
  connectedParticipants = 0
}) => {
  const { isConnected } = useSocket();

  const getStatusBadge = () => {
    switch (eventStatus) {
      case 'REGISTRATION_OPEN':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">REGISTRATION OPEN</span>;
      case 'REGISTRATION_CLOSED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">REGISTRATION CLOSED</span>;
      case 'LIVE':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center space-x-1.5"><Radio className="w-3.5 h-3.5 animate-pulse" /><span>EVENT LIVE</span></span>;
      case 'PAUSED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">EVENT PAUSED</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">EVENT COMPLETED</span>;
      default:
        return null;
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {getStatusBadge()}

        {/* Live connected teams counter */}
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs text-slate-300">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>{connectedParticipants} Online</span>
        </div>

        {/* Socket health */}
        <div className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full border ${
          isConnected
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3 animate-pulse" />}
        </div>
      </div>
    </header>
  );
};
