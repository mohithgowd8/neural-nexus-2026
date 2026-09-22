import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext.js';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isConnected } = useSocket();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline || !isConnected) {
    return (
      <div className="bg-amber-600/90 backdrop-blur-sm text-black px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 sticky top-16 sm:top-20 z-30 shadow-md">
        <WifiOff className="w-4 h-4 animate-bounce" />
        <span>Connection interrupted. Your saved answers are safe. Reconnecting...</span>
        <RefreshCw className="w-3.5 h-3.5 animate-spin ml-2 text-black/70" />
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 sticky top-16 sm:top-20 z-30 animate-fadeIn">
        <CheckCircle2 className="w-4 h-4" />
        <span>Connection restored. Answers synchronized.</span>
      </div>
    );
  }

  return null;
};
